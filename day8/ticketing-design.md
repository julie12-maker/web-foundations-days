# TicketHub Design

TicketHub is a website that sells tickets for concerts and events. This document follows the six-part design framework: requirements, estimates, API, data model, architecture and trade-offs.

## 1. Requirements

### Functional requirements
- Users can sign up, log in and log out.
- Users can browse and search upcoming events.
- Users can view an event and see which seats are free.
- Users can hold a seat for a short time (10 minutes) while they pay.
- Users can pay for held seats.
- Users can view their purchased tickets.
- A hold that is not paid for expires and the seat becomes free again.

### Non-functional requirements
- **Speed:** browsing pages load in under 500 ms, and a seat hold answers in under 1 second, even during a big sale.
- **Correctness:** a seat is never sold to two people, and nobody is charged without getting a ticket.
- **Fairness:** buyers are served roughly in the order they arrive, and one person may hold at most 4 seats, so bots and resellers cannot take everything.
- **Availability:** the site stays up during a big sale, even if some parts are overloaded.
- **Scalability:** the system can handle a sale that is hundreds of times busier than a normal day.
- **Security:** card details are handled by a payment provider and never stored by TicketHub.

## 2. Estimates

### Assumptions
- 2 million registered users.
- A day has 86,400 seconds.
- Peak traffic on a normal day is 5 times the average.
- During a big sale, each user makes about 10 requests (open the event, refresh the seat map, hold, pay).

### Normal day
- Page views: 50,000 visitors × 10 pages = 500,000 per day.
- Average: 500,000 ÷ 86,400 ≈ 5.8 page views per second.
- Peak (×5): ≈ 29 page views per second.
- Purchases: 5,000 tickets per day ÷ 86,400 ≈ 0.06 per second, about one every 17 seconds.

### Big sale (200,000 people, 20,000 seats, first 10 minutes)
- Arrivals: 200,000 ÷ 600 seconds ≈ 333 users per second.
- Requests: 333 × 10 ≈ 3,300 requests per second.
- Seat sales: 20,000 ÷ 600 ≈ 33 seats sold per second at most.
- Only 20,000 of 200,000 people (10%) can succeed, so 180,000 people will not get a seat.

### Comparison
The big sale is about 570 times busier than an average normal day (3,300 ÷ 5.8 requests per second), and more than 100 times busier than a normal peak (3,300 ÷ 29). The read traffic and the competition for the same seats both explode at once, so the design needs special protection for sales: a waiting room, caching and strict seat locking.

## 3. API

All requests use JSON over HTTPS. Endpoints that change data need a logged-in user.

| # | Method | Path | Description | Success |
|---|--------|------|-------------|---------|
| 1 | GET | `/events` | Browse upcoming events (supports `?q=` search and `?page=`). | 200 |
| 2 | GET | `/events/{event_id}` | View one event's details. | 200 |
| 3 | GET | `/events/{event_id}/seats` | View the seat map with each seat's status (free, held, sold). | 200 |
| 4 | POST | `/events/{event_id}/holds` | Hold one or more seats for 10 minutes. | 201 |
| 5 | POST | `/orders` | Pay for a hold and create an order. | 201 |
| 6 | GET | `/me/tickets` | View my purchased tickets. | 200 |
| 7 | DELETE | `/holds/{hold_id}` | Release a hold early. | 204 |

Example request body for `POST /events/12/holds`:

```json
{ "seat_ids": [301, 302] }
```

Example request body for `POST /orders`:

```json
{ "hold_id": 88, "payment_token": "tok_abc123" }
```

Errors: **400** for invalid input (for example more than 4 seats), **401** if not logged in, **404** if the event or hold does not exist, **409** if a seat is already held or sold.

## 4. Data model

### users
- `user_id` (primary key), `name`, `email` (unique, not null), `password_hash`.

### events
- `event_id` (primary key), `title`, `venue`, `starts_at`, `on_sale_at`.

### seats
- `seat_id` (primary key), `event_id` (foreign key to events), `section`, `row_label`, `seat_number`, `price`, `status` (`free`, `held` or `sold`), `held_by` (foreign key to users, can be empty), `hold_expires_at` (can be empty).
- `UNIQUE (event_id, section, row_label, seat_number)` so a physical seat exists once per event.

### orders
- `order_id` (primary key), `user_id` (foreign key to users), `status`, `total`, `created_at`.

### tickets
- `ticket_id` (primary key), `order_id` (foreign key to orders), `seat_id` (foreign key to seats).
- `UNIQUE (seat_id)` so a seat can appear on only one ticket.

### Relationships
- **users to orders:** one-to-many (a user can place many orders).
- **orders to tickets:** one-to-many (an order can contain several tickets).
- **events to seats:** one-to-many (an event has many seats).
- **seats to tickets:** one-to-one at most, because of the `UNIQUE (seat_id)` rule.
- **users to events:** many-to-many through orders, tickets and seats, because a user can attend many events and an event has many buyers.

## 5. Preventing double-booking

Two people must never buy the same seat, even if they click at the same instant. The design uses three layers, so that if one fails the next still protects the seat.

1. **A conditional update inside a transaction.** Holding a seat is one atomic SQL statement that only succeeds if the seat is still free:

```sql
BEGIN;
UPDATE seats
SET status = 'held', held_by = :user_id, hold_expires_at = :now_plus_10_min
WHERE seat_id = :seat_id AND status = 'free';
-- if 0 rows were changed, someone else got it first: roll back and return 409
COMMIT;
```

The database locks the row while it changes it, so when two requests arrive together, one runs first and changes the status to `held`. The second then finds `status = 'free'` is false, changes 0 rows and receives a 409 Conflict. Because the check and the change happen in one statement, there is no gap between "is it free?" and "take it" for a second buyer to slip into.

2. **A UNIQUE constraint as a safety net.** `UNIQUE (seat_id)` on the `tickets` table means the database itself refuses a second ticket for the same seat, even if a bug in the application code tried to create one.

3. **Holds that expire.** A hold lasts 10 minutes. A background job sets seats back to `free` when `hold_expires_at` has passed, so abandoned holds do not block a seat forever. Payment only succeeds if the seat is still held by that same user, so an expired hold cannot be paid for.

Paying is also a transaction: the order, the tickets and the change of the seat to `sold` either all happen or none do, so nobody is charged without receiving a ticket.

## 6. Architecture

```text
                       +-----------+
                       |   Users   |
                       +-----+-----+
                             |
                       +-----v-----+
                       |    CDN    |  (event pages, images)
                       +-----+-----+
                             |
                    +--------v--------+
                    |  Load balancer  |
                    +---+---------+---+
                        |         |
              +---------v--+   +--v---------+
              | App server |   | App server |  ...more as needed
              +--+----+----+   +----+----+--+
                 |    |             |    |
        +--------+    +------+------+    +---------+
        |                    |                     |
  +-----v------+      +------v------+       +------v-------+
  |   Cache    |      |   Waiting   |       |    Queue     |
  |  (Redis)   |      |    room     |       +------+-------+
  +------------+      +-------------+              |
                                            +------v-------+
                                            |   Workers    |
                                            | (email, expiry)
                                            +--------------+
        +-----------------------------+
        |  Database (primary)         |
        |  + read replica             |
        +-----------------------------+
```

### What each component does
- **CDN:** serves event pages and images from servers near the user, so the huge read traffic of a sale never reaches our servers.
- **Load balancer:** spreads requests across app servers and stops sending traffic to any that fail.
- **App servers:** run the API and are stateless, so many more can be started before a big sale.
- **Waiting room:** lets only a controlled number of people into the buying flow at once, in the order they arrived, which keeps the database safe and makes the sale fair.
- **Cache:** keeps event details and the seat map in memory for a few seconds, so thousands of people refreshing do not each hit the database.
- **Database (primary):** the single source of truth for seats and orders, where the transactions that prevent double-booking run.
- **Read replica:** answers browsing queries so the primary can focus on holds and payments.
- **Queue and workers:** send confirmation emails and release expired holds in the background, so these jobs never slow down a purchase.

### How it survives the big sale
- About 3,300 requests per second arrive, but the CDN and cache absorb most of the reading.
- The waiting room limits the buying flow to roughly the 33 seats per second that can actually be sold, so the primary database is never flooded.
- Seat holds are the only writes under pressure, and they are small, single-row updates that the database handles easily.
- App servers are added before the sale, since the sale time is known in advance.

## 7. Trade-offs

- **A waiting room is fair and protects the database, but makes users wait.** Most of the 200,000 people will queue and 180,000 will not get a seat. We accept this because a controlled queue is better than a crashed site where nobody can buy.
- **Caching the seat map keeps the site fast but can show a seat as free when it was just taken.** The user then gets a 409 when they try to hold it. We accept this because correctness is enforced by the database, so a stale display can never cause a double sale.
- **Holding seats for 10 minutes prevents losing a seat during payment, but locks seats away from others.** A shorter hold frees seats sooner but may cut off slow payers. We chose 10 minutes as a balance.
- **One primary database is simple and strongly consistent, but is the limit on write scale.** We accept this because only about 33 seats per second are sold. If that were not enough, seats could be split across databases by event.
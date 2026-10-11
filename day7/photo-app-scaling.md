# SnapShare Scaling Plan

SnapShare is a photo-sharing app where users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- 10 million registered users.
- 10% are active each day, so there are 1,000,000 daily active users (10,000,000 × 0.10).
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- An average photo is 2 MB, and each photo also gets a 50 KB thumbnail.
- A day has 86,400 seconds.
- Peak traffic is 5 times the average.

## 2. Estimates

### Uploads per second
- Uploads per day: 1,000,000 × 1 = 1,000,000.
- Average: 1,000,000 ÷ 86,400 ≈ 12 uploads per second.
- Peak (×5): ≈ 58 uploads per second.

### Feed views per second
- Feed views per day: 1,000,000 × 50 = 50,000,000.
- Average: 50,000,000 ÷ 86,400 ≈ 579 views per second.
- Peak (×5): ≈ 2,900 views per second.

### Storage per year
- Per photo: 2 MB original + 0.05 MB thumbnail = 2.05 MB.
- Per day: 1,000,000 × 2.05 MB ≈ 2.05 TB.
- Per year: 2.05 TB × 365 ≈ 748 TB, about 0.75 PB.

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are about 50 feed views for every upload (50,000,000 reads against 1,000,000 writes per day). This means the design should make reading fast and cheap: cache popular data, serve images from a CDN, and use a read replica so reads do not slow down writes.

## 4. Why photos should not be stored in the database

A database is built for small, structured rows that need searching and consistency. Photos are large files (2 MB each, hundreds of terabytes per year). Storing them in the database would make it huge, slow, expensive to back up and costly to scale. Instead, photos go in **object storage**, which is designed for large files and is cheap and durable. The database stores only the photo's metadata (owner, caption, time) and the **URL** that points to the file in object storage.

## 5. Architecture diagram

```text
                          +-----------+
                          |   Users   |
                          +-----+-----+
                                |
                          +-----v-----+
                          |    CDN    |  (serves photos and thumbnails)
                          +-----+-----+
                                |
                      +---------v---------+
                      |   Load balancer   |
                      +----+---------+----+
                           |         |
                  +--------v--+   +--v--------+
                  | App server|   | App server|   ...more as needed
                  +--+---+--+-+   +-+--+---+--+
                     |   |  |       |  |   |
        +------------+   |  +---+---+  |   +-------------+
        |                |      |      |                 |
  +-----v-----+   +------v------+  +----v-------+  +-----v------+
  |   Cache   |   |  Database   |  |   Object   |  |   Queue    |
  |  (Redis)  |   |  (primary)  |  |  storage   |  +-----+------+
  +-----------+   +------+------+  | (photos)   |        |
                         |         +-----^------+  +-----v------+
                  +------v------+        |         |   Worker   |
                  | Read replica|        +---------+ (thumbnails)|
                  +-------------+                  +------------+
```

## 6. What each component does

- **CDN:** serves photos and thumbnails from servers close to the user, so images load quickly and the origin servers are not overloaded.
- **Load balancer:** spreads incoming requests across many app servers, so no single server is overwhelmed and one failure does not stop the app.
- **App servers:** run the application logic (login, uploads, building the feed), and are stateless so more can be added to handle growth.
- **Cache:** keeps frequently requested data such as feed results in memory, so most reads skip the slower database.
- **Database (primary):** stores the structured data (users, follows, photo metadata and URLs) and handles all writes reliably.
- **Read replica:** a copy of the database that answers read queries, so the heavy read traffic does not slow down writes on the primary.
- **Object storage:** holds the large photo files cheaply and durably, so the database stays small and fast.
- **Queue:** holds thumbnail jobs, so the upload request returns quickly instead of waiting for image processing.
- **Worker:** takes jobs from the queue and creates the 50 KB thumbnail, so the heavy work happens in the background.

## 7. Upload flow

1. The user picks a photo in the app and taps Upload. The request goes through the load balancer to an app server.
2. The app server checks that the user is logged in and that the file is a valid image of an allowed size.
3. The app server saves the original photo (about 2 MB) in object storage and gets back its URL.
4. The app server writes a row in the primary database with the owner, caption, time and photo URL, marked "thumbnail pending".
5. The app server puts a "create thumbnail" job on the queue, then immediately tells the user the upload succeeded.
6. A worker takes the job from the queue, downloads the original from object storage and creates the 50 KB thumbnail.
7. The worker saves the thumbnail in object storage and updates the database row to "thumbnail ready".
8. When followers load their feed, the CDN serves the thumbnail and photo, and the cache and read replica supply the feed data.

**Why the queue is used:** making a thumbnail takes time. If the app server did it during the upload, the user would wait and a traffic spike could overload the servers. The queue lets the upload finish quickly and the worker catch up in the background.

## 8. Trade-offs

- **Caching speeds up reads but can show stale data.** A cached feed may not show a brand-new photo for a short time. We accept this because feeds are read about 50 times more than they are written, and a delay of a few seconds does not matter to users.
- **A read replica improves read capacity but can lag behind the primary.** A photo just uploaded may not appear on the replica immediately. We accept eventual consistency for feeds, and could read the user's own photos from the primary so they see their upload at once.
- **A queue and worker make uploads fast but add complexity.** There are more parts to run and monitor, and thumbnails appear a moment after the upload. The faster upload is worth it for the user experience.
- **A CDN and object storage cut load and cost per photo but add ongoing expense.** At about 0.75 PB per year, storage and bandwidth costs grow steadily, so old photos could be moved to cheaper storage tiers.
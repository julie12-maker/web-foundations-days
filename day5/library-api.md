# Library API Design

A REST API for a library's **books** resource. All paths start with `/books`. Requests and responses use JSON.

## Endpoints

### 1. List all books
- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book
- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** 200 OK

### 3. Create a book
- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958,
  "isbn": "9780385474542"
}
```

- **Success status:** 201 Created

### 4. Update a book
- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958,
  "isbn": "9780385474542"
}
```

- **Success status:** 200 OK

### 5. Delete a book
- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** 204 No Content

### 6. List books by an author
- **Method:** GET
- **Path:** `/books?author={name}`
- **Description:** Returns only the books written by the given author, using a query parameter.
- **Example:** `/books?author=Chinua%20Achebe`
- **Request body:** none
- **Success status:** 200 OK

## Error codes

### 400 Bad Request
- **Meaning:** The request is invalid or missing required data.
- **Example:** `POST /books` with a body that has no `title`, or `year` sent as text such as `"abc"`.

### 404 Not Found
- **Meaning:** The requested book does not exist.
- **Example:** `GET /books/9999` when no book has id 9999, or `DELETE /books/9999`.
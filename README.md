# Direct-to-DB Auth

A small TypeScript/Express example of using PostgreSQL row-level security (RLS) to isolate user data. The API verifies a JWT, places its claims in a transaction-local PostgreSQL setting, and runs queries under a restricted database role. PostgreSQL policies then limit each authenticated user to their own notes.

## How it works

1. The API verifies the bearer token with `JWT_SECRET`.
2. It starts a database transaction, switches to the application role, and sets `request.jwt.claims` for that transaction.
3. `current_app_user_id()` reads the JWT `sub` claim.
4. The RLS policy on `user_notes` permits authenticated operations only when the row's `user_id` matches that claim.

The database setup is in [`src/migrations.sql`](./src/migrations.sql), and the API is in [`src/index.ts`](./src/index.ts).

## Requirements

- Node.js
- pnpm
- PostgreSQL

## Setup

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create a PostgreSQL database for the app. Review `src/migrations.sql` before running it: it creates database roles and a demo password, so run it with a database administrator account and replace the demo password with a strong, locally managed value.

   ```sh
   psql "postgresql://<admin-user>:<password>@localhost:5432/<database>" -f src/migrations.sql
   ```

3. Configure the database connection in `src/index.ts` to point to your database. The connection string is currently embedded in the source; do not use production credentials in this example.

4. Set a private `JWT_SECRET` in the environment. The source has an insecure development fallback, so always override it:

   Powershell

   ```powershell
   $env:JWT_SECRET = "<a-long-random-secret>"
   ```

   cmd

   ```bash
   set JWT_SECRET=<a-long-random-secret>
   ```

   On macOS or Linux:

   ```sh
   export JWT_SECRET="<a-long-random-secret>"
   ```

5. Start the development server:

   ```sh
   pnpm dev
   ```

   The API listens on `http://localhost:3000`.

## API

### `GET /api/notes`

Returns the notes visible to the authenticated user. Send a JWT in the `Authorization` header:

```http
Authorization: Bearer <jwt>
```

### `POST /api/notes`

Creates a note for the authenticated user. The server derives `user_id` from the token; it is not supplied in the request body.

```http
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "title": "My note",
  "content": "Note contents"
}
```

Both endpoints use the JWT's `sub` claim as the user UUID. `src/scripts/jwt.js` is a local example that creates a token for one of its sample user IDs; it uses the demo secret and must not be used as-is outside local experimentation.

## Security note

This is a learning example, not a production-ready authentication service. It has a hard-coded database connection string, an insecure fallback JWT secret, demo role credentials, and minimal request validation. Use managed secrets, least-privilege database credentials, HTTPS, and appropriate validation and error handling before adapting it for production.

## Inspiration
- [Supabase](https://supabase.com)
- [PostgREST](https://docs.postgrest.org/)
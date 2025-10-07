# PetConnect Backend

## Quick start

1. Copy `.env.example` → `.env` and update values.
2. `npm install`
3. `npm run dev` (development with nodemon)
4. `npm start` (production)

## Scripts

- `npm run dev` - start dev server (nodemon)
- `npm run lint` - run eslint
- `npm run format` - run prettier

## Architecture

- Node + Express backend in `src/` (or top-level JS files)
- MongoDB via Mongoose
- Collections: users, pets, organizations, appointments, analytics, etc.

## Notes for code review

- Entry: `server.js`
- Models: see files referencing `mongoose.Schema`
- Add any ER diagrams or model docs here

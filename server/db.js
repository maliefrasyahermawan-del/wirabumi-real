import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// DATE (OID 1082) defaults to a JS Date object, which shifts the calendar day
// once serialized through JSON in any non-UTC server timezone. Keep it as the
// raw 'YYYY-MM-DD' string instead - that's what the frontend expects anyway.
pg.types.setTypeParser(1082, (val) => val);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

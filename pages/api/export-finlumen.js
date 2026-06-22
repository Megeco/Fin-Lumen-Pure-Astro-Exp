import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {

  const data = `
KPIT.NS|CORE ACCUMULATION|NEUTRAL|5
MAZDOCK.NS|FULL ATTACK|OPEN|9
DIXON.NS|AVOID|CLOSED|0
LT.NS|CORE HOLD|OPEN|9
NEWGEN.NS|CORE ACCUMULATION|OPEN|9
`;

  res.status(200).send(data);
}

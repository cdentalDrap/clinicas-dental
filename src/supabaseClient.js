import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oolmaerjshdsqedeyxxm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbG1hZXJqc2hkc3FlZGV5eHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODIxNjYsImV4cCI6MjA5MzU1ODE2Nn0.dw0ZkOjX-iqYXTQtKsD_Me_wwJ8toDo4eLL5XKJXb4g'

export const supabase = createClient(supabaseUrl, supabaseKey)

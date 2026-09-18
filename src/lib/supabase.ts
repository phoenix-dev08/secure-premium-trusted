import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://vsoprkokzbyijtmhgzun.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImJiOGU2ZTU0LTQ1MDEtNDRjNS1iNzRiLWQxZThmMzEwNmQ3YyJ9.eyJwcm9qZWN0SWQiOiJ2c29wcmtva3pieWlqdG1oZ3p1biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg5NzE0NDY2LCJleHAiOjIxMDUwNzQ0NjYsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.7lMimK-LD7oyOqNjWV6U575TNeI_sq3ei6lX2A3hnmU';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };
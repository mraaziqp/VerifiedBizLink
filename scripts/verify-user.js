const { neon } = require('@neondatabase/serverless');

const url = 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

(async () => {
  try {
    const user = await sql`
      SELECT id, email, full_name, role, email_verified, email_verification_token
      FROM users
      WHERE LOWER(email) = LOWER('mosopenclaw21@gmail.com')
      LIMIT 1
    `;
    console.log('User found in Neon DB:', user);

    if (user.length > 0) {
      await sql`
        UPDATE users
        SET email_verified = TRUE, email_verification_token = NULL, updated_at = NOW()
        WHERE id = ${user[0].id}
      `;
      console.log('Successfully verified email for:', user[0].email);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();

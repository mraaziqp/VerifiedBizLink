(async () => {
  try {
    const res = await fetch('http://localhost:9002/api/home/overview');
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text.slice(0, 300));
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
})();

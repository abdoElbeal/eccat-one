async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/subjects');
    console.log('Status:', res.status);
    const data = await res.json().catch(() => ({}));
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testApi();

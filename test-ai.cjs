fetch('http://localhost:3000/api/gemini/generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
    })
}).then(res => res.json()).then(console.log).catch(console.error);

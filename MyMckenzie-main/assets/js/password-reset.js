const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
	resetBtn.addEventListener('click', async (e) => {
		e.preventDefault();
		const email = document.getElementById('resetEmail').value.trim();
		if (!email) { alert('Please enter your email'); return; }
		try {
			const resp = await fetch('/api/reset-password', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email }) });
			const json = await resp.json();
			if (!resp.ok) throw new Error(json?.detail || json?.error || 'Reset failed');
			alert(json.message || 'Password reset requested.');
		} catch (err) { alert('Error: ' + (err.message || err)); }
	});
}

export async function GET() {
	return new Response(JSON.stringify({ message: 'Debug articles endpoint works.' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
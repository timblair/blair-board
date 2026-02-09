import https from 'node:https';
import { readFileSync } from 'node:fs';
import { handler } from './build/handler.js';
import polka from 'polka';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Load SSL certificates
const httpsOptions = {
	key: readFileSync('./localhost+3-key.pem'),
	cert: readFileSync('./localhost+3.pem')
};

// Create HTTPS server with polka
const httpsServer = https.createServer(httpsOptions);
const app = polka({ server: httpsServer }).use(handler);

app.listen({ host: HOST, port: PORT }, () => {
	console.log(`HTTPS server listening on https://${HOST}:${PORT}`);
	console.log(`  Local:   https://localhost:${PORT}`);
	console.log(`  Network: https://192.168.1.238:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM received, closing server...');
	httpsServer.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});

process.on('SIGINT', () => {
	console.log('SIGINT received, closing server...');
	httpsServer.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});

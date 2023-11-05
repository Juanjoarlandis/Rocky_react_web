import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

// Create an instance of express
const app = express();

// Use CORS middleware to allow requests from your React application domain
app.use(cors({
    origin: 'https://www.rocky035.com/rockyIA' // This should match the domain that your React app is served from
}));

app.use(express.json());

app.post('/api/proxy', async (req, res) => {
    const url = 'https://api.bitapai.io/text'; // Replace with your actual URL

    try {
        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': '6b337c13-24f2-4eb4-b180-c01a5fc9f622' // Replace with your actual API key
            },
            body: JSON.stringify(req.body)
        });

        if (!apiResponse.ok) {
            throw new Error(`API responded with status: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

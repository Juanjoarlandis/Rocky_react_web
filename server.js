import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // make sure to install node-fetch if you haven't


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


//app.use(limiter);

// Custom proxy endpoint
app.post('/api/proxy', async (req, res) => {
    const apiUrl = 'https://api.bitapai.io/text';
    const body = JSON.stringify(req.body);

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'POST', // Explicitly set the method to POST
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': process.env.BITAPAI_API_KEY // Use the API key from environment variables
            },
            body: body
        });

        if (!apiResponse.ok) {
            throw new Error(`API responded with status: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        res.json(data); // Send the response from BitAPAI back to the client
    } catch (error) {
        console.error('Error when proxying to BitAPAI:', error);
        res.status(500).json({ message: 'Error when proxying the request.' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(bodyParser.json());

let globalTokens = null;  // Store tokens globally


 
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;


const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Route to generate authentication URL
 app.get('/auth-url', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar'],
        prompt: 'consent',
    });
    res.json({ authUrl });
});


// Route to handle OAuth callback
//  app.get('/auth-callback', async (req, res) => {
//     const { code } = req.query;  // The code returned by Google after authorization
//     try {
//         const { tokens } = await oAuth2Client.getToken(code);  // Exchange the code for tokens
//         oAuth2Client.setCredentials(tokens);  // Set the credentials to the OAuth2 client
        
//         globalTokens = tokens;  // Save the tokens globally
        
//         res.send('Authentication successful! You can close this window.');
//     } catch (error) {
//         console.error('Error during authentication:', error);
//         res.status(500).send('Authentication failed');
//     }
// });
app.get('/auth-callback', async (req, res) => {
    const { code } = req.query; // The code returned by Google after authorization
    try {
        const { tokens } = await oAuth2Client.getToken(code); // Exchange the code for tokens
        oAuth2Client.setCredentials(tokens); // Set the credentials to the OAuth2 client

        globalTokens = tokens; // Save the tokens globally

        // Return an HTML page with a visible message
        res.send(`
            <html>
                <head>
                    <title>Authentication</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f9f9f9;
                        }
                        .message {
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="message">
                        <h1>Authentication Successful</h1>
                        <p>You can close this window.</p>
                    </div>
                    <script>
                        alert('Authentication successful!');
                        // Optionally close the window if it's a popup
                        window.close();
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send(`
            <html>
                <head>
                    <title>Authentication Failed</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f9f9f9;
                        }
                        .message {
                            text-align: center;
                            color: red;
                        }
                    </style>
                </head>
                <body>
                    <div class="message">
                        <h1>Authentication Failed</h1>
                        <p>Please try again.</p>
                    </div>
                    <script>
                        alert('Authentication failed. Please try again.');
                    </script>
                </body>
            </html>
        `);
    }
});





// Route to fetch events
 app.get('/get-events', async (req, res) => {
    try {
        // Check if tokens are stored
        if (!globalTokens) {
    return res.status(401).json({ message: 'Unauthorized, no tokens available.' });
}

// Set credentials with the stored tokens
oAuth2Client.setCredentials(globalTokens);


        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        // Fetch events from Google Calendar
        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        res.status(200).json(events.data.items);
    } catch (error) {
        console.error('Error fetching events:', error.message);
        res.status(500).json({ message: 'Error fetching events.' });
    }
});

 async function refreshToken() {
    if (!globalTokens) return null;

    const { access_token, refresh_token } = globalTokens;

    try {
        oAuth2Client.setCredentials({ access_token, refresh_token });
        const newTokens = await oAuth2Client.refreshAccessToken();
        globalTokens = newTokens.credentials;
        return newTokens.credentials;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
}



// Route to add events
 app.post('/add-event', async (req, res) => {
    try {
        const { summary, description, startTime, endTime } = req.body;

        // Convert startTime and endTime to ISO string format
        const start = new Date(startTime).toISOString();
        const end = new Date(endTime).toISOString();

        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        const event = {
            summary,
            description,
            start: {
                dateTime: start,  // Use the ISO formatted start time
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: end,    // Use the ISO formatted end time
                timeZone: 'Asia/Kolkata',
            },
        };

        // Insert the event into the calendar
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        res.status(201).json({ message: 'Event added successfully', eventId: response.data.id });
    } catch (error) {
        console.error('Error adding event:', error.message);
        res.status(500).json({ message: 'Failed to add event.' });
    }
});


// Route to delete an event
app.delete('/delete-event', async (req, res) => {
    const { eventId } = req.body;  // Get the eventId from the request body
    if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
    }

    try {
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        // Delete the event by its ID
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error.message);
        res.status(500).json({ message: 'Failed to delete event.' });
    }
});

// Route to update an event
  app.put('/update-event', async (req, res) => {
    const { eventId, summary, description, startTime, endTime } = req.body;

    if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
    }

    if (!startTime || !endTime) {
        return res.status(400).json({ message: 'Start and end time are required' });
    }

    // Validate that the start and end time are in the correct format
    if (isNaN(new Date(startTime)) || isNaN(new Date(endTime))) {
        return res.status(400).json({ message: 'Invalid start or end time' });
    }

    try {
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        // Fetch the event to ensure it exists
        const eventResponse = await calendar.events.get({
            calendarId: 'primary',
            eventId: eventId,
        });

        // Prepare the updated event
        const updatedEvent = {
            summary: summary || eventResponse.data.summary,
            description: description || eventResponse.data.description,
            start: { 
                dateTime: startTime || eventResponse.data.start.dateTime,  // Make sure this follows the correct format (ISO 8601)
                timeZone: 'Asia/Kolkata',
            },
            end: { 
                dateTime: endTime || eventResponse.data.end.dateTime,  // Make sure this follows the correct format (ISO 8601)
                timeZone: 'Asia/Kolkata',
            },
            reminders: eventResponse.data.reminders,  // Retain existing reminders
            colorId: eventResponse.data.colorId,      // Retain color ID if needed
        };

        console.log('Updated event:', updatedEvent);

        // Update the event with the new details
        const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            resource: updatedEvent,
        });

        res.status(200).json({ message: 'Event updated successfully', event: response.data });
    } catch (error) {
        console.error('Error updating event:', error.message);
        res.status(500).json({ message: 'Failed to update event.', error: error.message });
    }
});



// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

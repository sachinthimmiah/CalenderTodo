import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const serverUrl = "http://localhost:5000"; // Backend server URL

const App = () => {
    const [authStatus, setAuthStatus] = useState(""); // Status of authorization
    const [events, setEvents] = useState([]); // List of events
    const [task, setTask] = useState({
        summary: "",
        description: "",
        startTime: "",
        endTime: "",
    });
    const [isUpdating, setIsUpdating] = useState(false); // Track whether the form is in update mode
    const [selectedEvent, setSelectedEvent] = useState(null); // Store the selected event to update

    // Fetch events when the component is mounted
    useEffect(() => {
        fetchEvents();
    }, []);

    // Handle Authorization
    const handleAuthorize = async () => {
        try {
            const response = await axios.get(`${serverUrl}/auth-url`);
            const { authUrl } = response.data;
            window.open(authUrl);  // Open the Google OAuth consent screen in a new window
            setAuthStatus("Authorization in progress...");
        } catch (error) {
            console.error("Error authorizing:", error);
        }
    };

    // Handle input change
    const handleChange = (e) => {
        setTask({ ...task, [e.target.name]: e.target.value });
    };

    // Handle form submission to add or update an event
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Task being sent:", task); // Log the task before sending

    try {
        if (isUpdating) {
            const updatedEvent = {
                eventId: selectedEvent.id,
                summary: task.summary,
                description: task.description,
                startTime: task.startTime,
                endTime: task.endTime,
            };

            console.log("Updated event data:", updatedEvent); // Log the updated event data before sending

            await axios.put(`${serverUrl}/update-event`, updatedEvent);
            alert("Event updated successfully!");
        } else {
            await axios.post(`${serverUrl}/add-event`, task);
            alert("Event added to Google Calendar!");
        }
        setTask({ summary: "", description: "", startTime: "", endTime: "" });
        setIsUpdating(false);
        fetchEvents();
    } catch (error) {
        console.error("Error adding/updating event:", error);
        alert("Failed to add/update event. Please check your input and try again.");
    }
};


    // Fetch events from Google Calendar
    const fetchEvents = async () => {
        try {
            const response = await axios.get(`${serverUrl}/get-events`);
            setEvents(response.data);
        } catch (error) {
            console.error("Error fetching events:", error.message);
        }
    };

    // Delete an event
    const handleDelete = async (eventId) => {
        try {
            await axios.delete(`${serverUrl}/delete-event`, { data: { eventId } });
            alert("Event deleted successfully!");
            fetchEvents(); // Refresh events after deletion
        } catch (error) {
            console.error("Error deleting event:", error.message);
            alert("Failed to delete event.");
        }
    };

    // Set the event for updating
    const handleUpdate = (event) => {
        setSelectedEvent(event);
        setTask({
            summary: event.summary,
            description: event.description || "",
            startTime: event.start?.dateTime || "",
            endTime: event.end?.dateTime || "",
        });
        setIsUpdating(true); // Set form to update mode
    };

    // Reset the form to add mode
    const resetForm = () => {
        setTask({ summary: "", description: "", startTime: "", endTime: "" });
        setIsUpdating(false); // Set form to add mode
    };

     return (
    <div className="App">
        <h2>To-Do List with Google Calendar</h2>
        <button id="btn1" onClick={handleAuthorize}>Authorize Google Calendar</button>
        <p>{authStatus}</p>

        {/* Add Task Form */}
        {!isUpdating && (
            <div>
                <h2>Add Task</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="summary"
                        value={task.summary}
                        onChange={handleChange}
                        placeholder="Task Summary"
                        required
                    />
                    <input
                        type="text"
                        name="description"
                        value={task.description}
                        onChange={handleChange}
                        placeholder="Task Description"
                    />
                    <input
                        type="datetime-local"
                        name="startTime"
                        value={task.startTime}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="datetime-local"
                        name="endTime"
                        value={task.endTime}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">Add Task</button>
                </form>
            </div>
        )}

        {/* Update Task Form */}
        {isUpdating && (
            <div>
                <h2>Update Task</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="summary"
                        value={task.summary}
                        onChange={handleChange}
                        placeholder="Task Summary"
                        required
                    />
                    <input
                        type="text"
                        name="description"
                        value={task.description}
                        onChange={handleChange}
                        placeholder="Task Description"
                    />
                    <input
                        type="datetime-local"
                        name="startTime"
                        value={task.startTime}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="datetime-local"
                        name="endTime"
                        value={task.endTime}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">Update Task</button>
                    <button type="button" onClick={resetForm}>
                        Cancel Update
                    </button>
                </form>
            </div>
        )}

        {/* Upcoming Events Section */}
        <div className="upcoming-events-container">
            <h2>Upcoming Events</h2>
            {events.length === 0 ? (
                <p>No events found. Please check your calendar.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Event Name</th>
                            <th>Description</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                            <tr key={event.id}>
                                <td>{event.summary || "No Summary"}</td>
                                <td>{event.description || "No Description"}</td>
                                <td>
                                    {event.start?.dateTime
                                        ? new Date(event.start.dateTime).toLocaleString()
                                        : event.start?.date || "Not specified"}
                                </td>
                                <td>
                                    {event.end?.dateTime
                                        ? new Date(event.end.dateTime).toLocaleString()
                                        : event.end?.date || "Not specified"}
                                </td>
                                <td>
                                    <button id="btn1" onClick={() => handleUpdate(event)}>Update</button>
                                    <button id="btn2" onClick={() => handleDelete(event.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
);

};

export default App;

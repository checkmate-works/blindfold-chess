const content = `# Caution Regarding Data Handling

## Data Stored in the Browser

The following data is stored in your browser (localStorage). It is not sent to the server and is not synchronized between devices.

- Game data (saved games, move history, etc.)
- Game preferences (peek mode, show coordinates, etc.)
- Practice settings (time limits, FEN settings, etc.)
- Tutorial skip flags
- Theme settings (dark/light mode)

### Potential Data Loss

Data stored in the browser will not disappear when you close your browser.
However, it may be lost due to the following events:

- Deleting browser history or site data through user action.
- Deleting or reinstalling your browser.
- Exceeding storage limits.
- Browser updates or malfunctions.
- Changes in data storage methods by the service provider.

## Data Stored on the Server

The following data is stored on the server and managed in association with your user account.

- User profile (display name, avatar)
- Authentication information
- Leaderboard / rankings
- Social features (topic posts, likes, follows, ratings)
- Moderation records

## Account Deletion

Users can delete their account. When an account is deleted, data stored on the server will be removed. Data stored in the browser is not affected by account deletion, so please delete it manually from your browser if needed.

## Usage Notice

This web service stores data both in the browser and on the server. Please be aware that data stored in the browser may be lost for the reasons described above.`;

export default content;

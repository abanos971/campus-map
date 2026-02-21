# Project Structure

## Frontend Organization

```
public/                  # All frontend static files (served to browser)
  css/
    styles.css          # UI styling (edit here)
  js/
    map.js              # Map functionality (your domain - don't break this!)
  index.html            # Main UI page (for UI teammate to work on)
  map.html              # Direct map demo
```

## Team Workflow

**UI Teammate** (`public/`)
- Edit `index.html` for layout and structure
- Edit `css/styles.css` for styling
- Don't edit `js/map.js`

**Map Developer** (`public/js/`)
- Work on `map.js` for all map functionality
- Don't change HTML structure without coordination

## Running the App

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/index.html` for the main app

## Backend

`src/` folder is reserved for future backend routes/logic

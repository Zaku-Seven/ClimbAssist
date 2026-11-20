# Web Client

The web client is the React and TypeScript frontend climbers use in a phone browser. It sends a wall photo to the application server and shows a numbered way to climb the route.

Status: upload, preview, and step-through are implemented. Hold detection on the server is not. If `POST /analyze` is missing or fails, the page shows the checked-in sample wall and says so.

Developed with Node.js v22.23.4 and npm 10.9.9.

## Run locally

From the `web-client/` folder:

```
npm install
npm run dev
```

The dev server uses port 5173 by default. Open http://localhost:5173.

Choose a JPEG or PNG up to 10 MB, check the preview, then choose Analyze. The page posts the file to `POST /analyze` at `VITE_API_URL`, or `http://localhost:8000` when that variable is unset. A successful response looks like this:

```json
{
  "imageWidth": 640,
  "imageHeight": 880,
  "holds": [{ "id": "h1", "x": 0.46, "y": 0.86, "order": 1 }],
  "moves": [{ "step": 1, "holdId": "h1", "limb": "Right hand to hold 1" }]
}
```

`x` and `y` are fractions of the image, from 0 to 1. The page numbers those holds and highlights the current move. Back and Next move one step at a time.

Use Sample wall to skip the upload and show `public/fixtures/sample-wall.png` with `public/fixtures/sample-route.json`. That path does not need the application server.

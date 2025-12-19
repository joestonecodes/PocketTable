import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { store } from './store';
import { setupSocket } from './socket';
import { v4 as uuidv4 } from 'uuid';
import { RoomStateSchema, RoomStateType } from 'vtt-shared';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 1e8 // 100MB socket limit
});

// Uploads config
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Init Redis
store.connect();

// Health check
app.get('/healthz', (req, res) => {
    res.send('ok');
});

// Create Room
app.post('/api/rooms', async (req, res) => {
    try {
        const { password, gmId } = req.body;
        const roomId = uuidv4().slice(0, 8);

        const roomState: RoomStateType = {
            id: roomId,
            gmId: gmId || uuidv4(),
            passwordHash: password ? password : null,
            config: {
                gridType: 'SQUARE',
                gridSize: 50,
                gridScale: 5,
                gridVisible: true,
                gridColor: '#000000',
                gridOpacity: 0.2
            },
            map: null,
            tokens: {},
            drawings: {},
            fog: [],
            timer: null,
            players: {}
        };

        await store.saveRoom(roomId, roomState);
        res.json({ roomId, gmId: roomState.gmId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Upload Map
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `http://localhost:4000/uploads/${req.file.filename}`;
    // Simple dimensions hack? For MVP, client loads image and sends dims to server.
    // We just return URL here.
    res.json({ url, filename: req.file.originalname });
});

setupSocket(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS để cho phép frontend trên Vercel và cục bộ
const allowedOrigins = [
    'https://momo-check-fe.vercel.app', // Domain frontend trên Vercel
    'http://localhost:3000' // Origin của máy tính cục bộ khi phát triển
];

app.use(cors({
    origin: function (origin, callback) {
        // Bỏ qua kiểm tra origin nếu origin không được xác định (ví dụ: Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'Origin không được phép bởi CORS';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Route để kiểm tra tài khoản Momo
app.post('/api/check-momo', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, message: 'Số điện thoại là bắt buộc.' });
    }

    try {
        const response = await axios.post('https://momosv3.apimienphi.com/api/checkMomoUser', {
            access_token: process.env.ACCESS_TOKEN,
            phone: phone
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Giả sử API Momo trả về dữ liệu như sau
        // { error: 0, phone: "0945173179", name: "Nguyễn Duy Thông" }
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error calling Momo API:', error.message);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi kiểm tra tài khoản Momo.' });
    }
});

// Route mặc định để kiểm tra backend đang chạy
app.get('/', (req, res) => {
    res.send('Momo Check Backend is running.');
});

// Route kiểm tra trạng thái backend
app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend is running properly.' });
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

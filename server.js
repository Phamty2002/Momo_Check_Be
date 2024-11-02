const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS để cho phép frontend
app.use(cors({
    origin: 'http://localhost:3000', // URL của frontend
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
        // { success: true, registered: true, message: "..." }
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error calling Momo API:', error.message);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi kiểm tra tài khoản Momo.' });
    }
});

// Route mặc định
app.get('/', (req, res) => {
    res.send('Momo Check Backend is running.');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS để cho phép frontend trên Vercel và phát triển cục bộ
const allowedOrigins = [
    'https://momo-check-fe.vercel.app', // Domain frontend trên Vercel (không có dấu gạch chéo cuối cùng)
    'http://localhost:3000' // Origin của máy tính cục bộ khi phát triển
];

// Cấu hình CORS
app.use(cors({
    origin: function (origin, callback) {
        // Bỏ qua kiểm tra origin nếu origin không được xác định (ví dụ: Postman, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'Origin không được phép bởi CORS';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Bao gồm các phương thức cần thiết
    allowedHeaders: ['Content-Type', 'Authorization'], // Bao gồm 'Authorization'
    credentials: true // Cho phép gửi cookies nếu cần
}));

app.use(express.json());

// Kết nối đến MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Kết nối MongoDB thành công'))
.catch((err) => {
    console.error('Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
});

// Import mô hình User
const User = require('./models/User');

// Middleware để xác thực JWT
const authenticate = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Token không hợp lệ' });
    }
};

// Route đăng ký người dùng
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    try {
        // Kiểm tra xem user đã tồn tại chưa
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User đã tồn tại' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo user mới
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        // Tạo token JWT mà không có thời gian hết hạn
        const token = jwt.sign(
            { id: newUser._id, username: newUser.username },
            process.env.JWT_SECRET
            // { expiresIn: '1h' } // Đã loại bỏ
        );

        res.status(201).json({ token, user: { id: newUser._id, username: newUser.username, email: newUser.email } });
    } catch (error) {
        console.error('Lỗi đăng ký:', error.message);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng ký' });
    }
});

// Route đăng nhập người dùng
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    try {
        // Tìm user theo email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User không tồn tại' });
        }

        // Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu không chính xác' });
        }

        // Tạo token JWT mà không có thời gian hết hạn
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET
            // { expiresIn: '1h' } // Đã loại bỏ
        );

        res.status(200).json({ token, user: { id: user._id, username: user.username, email: user.email } });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error.message);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng nhập' });
    }
});

// Route bảo vệ (ví dụ: lấy thông tin người dùng)
app.get('/api/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Loại bỏ mật khẩu khỏi phản hồi
        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại' });
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error('Lỗi lấy profile:', error.message);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy profile' });
    }
});

// Route để kiểm tra tài khoản Momo
app.post('/api/check-momo', authenticate, async (req, res) => { // Bảo vệ route này
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

// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Định nghĩa schema cho User
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Email không hợp lệ']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
}, { timestamps: true });

// Mã hóa mật khẩu trước khi lưu
UserSchema.pre('save', async function (next) {
    try {
        if (!this.isModified('password')) {
            return next();
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(this.password, salt);
        this.password = hashedPassword;
        next();
    } catch (error) {
        next(error);
    }
});

// Phương thức kiểm tra mật khẩu
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

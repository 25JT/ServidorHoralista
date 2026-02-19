import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";
dotenv.config();

// Configuration
cloudinary.config({
    cloud_name: process.env.CloudnameClouddinary,
    api_key: process.env.APIkeyClouddinary,
    api_secret: process.env.APIsecretClouddinary
});

export default cloudinary;

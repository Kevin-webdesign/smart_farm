import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MONGODB CONNECTED ${connect.connection.host}`);
  } catch (error) {
    console.error(`connection failed :${error}`);
  }
};

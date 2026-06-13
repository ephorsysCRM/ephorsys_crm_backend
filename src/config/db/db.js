import mongoose from "mongoose";
const connectToDb = () => {
  mongoose
    .connect(process.env.MONGODB_URL)
    .then(() => {
      console.log("Database is Connected");
    })
    .catch((err) => {
      console.error("Error Connecting To Db:", err.message);
      process.exit(1);
    });
};

export default connectToDb;

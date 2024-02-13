import { MongoClient } from "mongodb";

export const clearExpiredOTPs = async () => {
  try {
    const client = await MongoClient.connect(process.env.DB_URL!);
    const db = client.db();
    const collection = db.collection("otps");
    const now = new Date();

    await collection.deleteMany({ expires: { $lt: now } });
    console.log("Expired OTPs cleared successfully.");
    client.close();
  } catch (error) {
    console.error("Error clearing expired sessions:", error);
  }
};

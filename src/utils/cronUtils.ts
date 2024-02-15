import { MongoClient } from "mongodb";

const clearExpiredCollections = async () => {
  try {
    const client = await MongoClient.connect(process.env.DB_URL!);
    const db = client.db();
    const otpCollection = db.collection("otps");
    const userDataCollection = db.collection("userdatas");
    const now = new Date();

    await otpCollection.deleteMany({ expires: { $lt: now } });
    await userDataCollection.deleteMany({ expires: { $lt: now } });
    console.log("Expired Colections cleared successfully.");
    client.close();
  } catch (error) {
    console.error("Error clearing Expired Collection:", error);
  }
};

export default clearExpiredCollections;

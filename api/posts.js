import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { credential } from "firebase-admin";

// 從環境變數中取得 Firebase 服務帳戶資訊
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const QUOTA_LIMIT = 5; // 定義每個金鑰的使用次數上限

// 初始化 Firebase Admin SDK
// 確保只初始化一次，避免因為重複初始化而產生的錯誤
if (!getApps().length) {
  try {
    // 檢查服務帳戶是否已設定
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }
    initializeApp({
      credential: credential.cert(JSON.parse(serviceAccount))
    });
  } catch (error) {
    console.error("Firebase Admin SDK 初始化失敗:", error);
    // 這裡我們不拋出錯誤，讓程式繼續執行，因為有些情況下這個模組可能不需要初始化
  }
}

const db = getFirestore();

// Vercel 的無伺服器函式
export default async function handler(req, res) {
  // CORS 標頭，確保跨來源請求能被允許
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  // 處理瀏覽器發送的 OPTIONS 預檢請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- API 金鑰認證與計數邏輯 ---
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    let keyDocRef;
    let keyData;

    try {
      // 在 Firestore 中尋找符合 API 金鑰的文檔
      // 注意：db.collectionGroup('api_keys') 會在所有名為 'api_keys' 的資料夾中尋找
      const keySnapshot = await db.collectionGroup('api_keys').where('key', '==', apiKey).limit(1).get();
      
      if (keySnapshot.empty) {
        return res.status(401).json({ error: '無效的 API 金鑰' });
      }

      keyDocRef = keySnapshot.docs[0].ref;
      keyData = keySnapshot.docs[0].data();

      // 檢查是否超過使用次數配額
      if (keyData.usage >= QUOTA_LIMIT) {
        return res.status(429).json({ error: '配額已用完' });
      }
      
      // 使用事務（Transaction）來安全地增加使用次數
      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(keyDocRef);
        if (!docSnap.exists) {
          throw new Error("文檔不存在");
        }
        const newUsage = docSnap.data().usage + 1;
        transaction.update(keyDocRef, { usage: newUsage });
      });

    } catch (error) {
      console.error("API 金鑰處理失敗:", error);
      return res.status(500).json({ error: '內部伺服器錯誤' });
    }
  }
  // --- 認證邏輯結束 ---

  // 檢查請求的方法
  if (req.method === 'GET') {
    // 如果是 GET 請求，從 Firestore 讀取所有文章
    const postsRef = db.collection('posts');
    const snapshot = await postsRef.get();
    
    // 將 Firestore 查詢結果轉換成 JSON 陣列
    const posts = snapshot.docs.map(doc => ({
      id: doc.id, // 使用 Firestore 的文檔 ID 作為文章 ID
      ...doc.data() // 展開文檔中的所有欄位
    }));

    res.status(200).json(posts);

  } else if (req.method === 'POST') {
    // 如果是 POST 請求，從請求主體中取得所有需要的欄位
    const { 
      title, 
      acceleration_x, 
      acceleration_y, 
      acceleration_z, 
      latitude, 
      longitude 
    } = req.body; 

    // 檢查 title 是否為空
    if (!title) {
      return res.status(400).json({ error: '需要提供文章標題' });
    }
    
    // 建立一個新的文章物件，時間戳記會自動產生
    const newPost = {
      title: title,
      acceleration_x: acceleration_x || null,
      acceleration_y: acceleration_y || null,
      acceleration_z: acceleration_z || null,
      latitude: latitude || null,
      longitude: longitude || null,
      createdAt: FieldValue.serverTimestamp() // 使用 Firestore 的伺服器時間戳記
    };
    
    try {
        // 將新文章加入到 'posts' 集合中
        // add() 方法會自動為你生成一個獨一無二的 ID
        const docRef = await db.collection('posts').add(newPost);
        
        // 回傳新文章的資訊，包含 Firestore 自動生成的 ID
        res.status(201).json({ id: docRef.id, ...newPost });
    } catch (error) {
        console.error("將文章寫入 Firestore 失敗:", error);
        return res.status(500).json({ error: '內部伺服器錯誤，無法儲存文章' });
    }
    
  } else {
    // 如果是其他不支援的方法，回傳 405 Method Not Allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

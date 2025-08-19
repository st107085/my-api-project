import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { credential } from "firebase-admin";

// 從環境變數中取得 Firebase 服務帳戶資訊
// 注意：你需要從 Vercel 的專案設定中添加這個環境變數
// 變數名稱: FIREBASE_SERVICE_ACCOUNT
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const QUOTA_LIMIT = 5; // 定義每個金鑰的使用次數上限

// 這裡我們將預設文章陣列清空，讓 API 從一個沒有資料的狀態開始
let posts = [];

// 初始化 Firebase Admin SDK
// 確保只初始化一次
if (!initializeApp.length) {
  initializeApp({
    credential: credential.cert(serviceAccount)
  });
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
      // 在 Firestore 中尋找符合 API 金鑰的文檔 (現在從公開資料夾尋找)
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
      await runTransaction(db, async (transaction) => {
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
    // 如果是 GET 請求，回傳所有文章資料
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
    
    // 產生一個新的獨一無二的 id
    const newId = posts.length > 0 ? Math.max(...posts.map(post => post.id)) + 1 : 1;
    
    // 建立一個新的文章物件
    const newPost = {
      id: newId,
      title: title,
      acceleration_x: acceleration_x || null,
      acceleration_y: acceleration_y || null,
      acceleration_z: acceleration_z || null,
      latitude: latitude || null,
      longitude: longitude || null
    };
    
    // 將新文章加入到我們的資料陣列中
    posts.push(newPost);
    
    // 回傳新文章的資訊
    res.status(201).json(newPost);
  } else {
    // 如果是其他不支援的方法，回傳 405 Method Not Allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

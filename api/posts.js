// 這個陣列用來模擬資料庫，儲存所有文章
// 每次 Vercel 重新啟動函式時，這個陣列都會被重設
let posts = [
  { id: 1, title: '我的 Vercel API 處女作' },
  { id: 2, title: 'Vercel Serverless 的奇妙旅程' }
];

// 這是一個 Vercel 的無伺服器函式，它會處理所有的 API 請求
// req 包含了請求的資訊 (e.g., 方法, 網址, 主體)
// res 包含了回應的工具，用來回傳資料給使用者
export default function handler(req, res) {
  // 檢查請求的方法
  if (req.method === 'GET') {
    // 如果是 GET 請求，回傳所有文章資料
    res.status(200).json(posts);
  } else if (req.method === 'POST') {
    // 如果是 POST 請求，從請求主體中取得文章標題
    const { title } = req.body; 

    // 檢查標題是否為空，如果為空則回傳 400 Bad Request
    if (!title) {
      return res.status(400).json({ error: '需要提供文章標題' });
    }
    
    // 產生一個新的獨一無二的 id
    const newId = posts.length > 0 ? Math.max(...posts.map(post => post.id)) + 1 : 1;
    
    // 建立一個新的文章物件
    const newPost = {
      id: newId,
      title: title
    };
    
    // 將新文章加入到我們的資料陣列中
    posts.push(newPost);
    
    // 回傳新文章的資訊，並設定狀態碼為 201 Created
    res.status(201).json(newPost);
  } else {
    // 如果是其他不支援的方法，回傳 405 Method Not Allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

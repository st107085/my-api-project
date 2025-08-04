// 這個變數只會被初始化一次，但每次請求都會存取它。
// 為了避免重複建立，我們把它放在外面。
let posts = [
  { id: 1, title: '這是我的第一篇文章' },
  { id: 2, title: 'API 的奇妙世界' }
];

export default function handler(req, res) {
  // --- 新增這幾行程式碼來處理 CORS ---
  // 設定允許所有來源（*）的網域發送請求
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  // 設定允許的方法（例如 GET, POST, OPTIONS...）
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  // 設定允許的標頭
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 瀏覽器在發送 POST 請求前，會先發送一個 OPTIONS 請求來詢問伺服器是否允許
  // 我們需要先處理這個 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // --- 新增程式碼結束 ---
  
  if (req.method === 'GET') {
    // 如果是 GET 請求，就回傳所有文章
    res.status(200).json(posts);
  } else if (req.method === 'POST') {
    const { title } = req.body; 
    
    // 檢查是否有傳送 title
    if (!title) {
      // 如果沒有，回傳錯誤訊息
      return res.status(400).json({ error: '需要提供文章標題' });
    }

    // 產生新的 id
    const newId = posts.length > 0 ? Math.max(...posts.map(post => post.id)) + 1 : 1;
    
    // 建立新文章物件
    const newPost = {
      id: newId,
      title: title
    };
    
    // 將新文章加入到我們的資料陣列中
    posts.push(newPost);
    
    // 回傳新文章的資訊和一個狀態碼 201
    res.status(201).json(newPost);
  } else {
    // 如果是其他不支援的方法，回傳 405 錯誤
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

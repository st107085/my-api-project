// ...（其他程式碼保持不變）

export default function handler(req, res) {
  // --- 新增這幾行程式碼來處理 CORS ---
  // 設定允許所有來源（*）的網域發送請求
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  // 設定允許的方法（例如 GET, POST, OPTIONS...）
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    res.status(200).json(posts);
  } else if (req.method === 'POST') {
    const { title } = req.body; 
    if (!title) {
      return res.status(400).json({ error: '需要提供文章標題' });
    }
    const newId = posts.length > 0 ? Math.max(...posts.map(post => post.id)) + 1 : 1;
    const newPost = {
      id: newId,
      title: title
    };
    posts.push(newPost);
    res.status(201).json(newPost);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

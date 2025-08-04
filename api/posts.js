let posts = [
  { id: 1, title: '這是我的第一篇文章' },
  { id: 2, title: 'API 的奇妙世界' }
];

export default function handler(req, res) {
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

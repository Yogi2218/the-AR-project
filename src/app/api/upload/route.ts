import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // 'knowledge' | 'avatar'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Determine target directory
    let targetDir = 'public/uploads';
    if (type === 'knowledge') targetDir = 'public/knowledge';
    if (type === 'avatar') targetDir = 'public/models'; // or public/thumbnails
    
    // Ensure filename is safe and unique
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadPath = path.join(process.cwd(), targetDir, filename);

    // Create dir if doesn't exist
    await fs.mkdir(path.join(process.cwd(), targetDir), { recursive: true });
    
    // Write file
    await fs.writeFile(uploadPath, buffer);

    // Return the public URL path
    const publicUrl = `/${targetDir.replace('public/', '')}/${filename}`;
    
    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

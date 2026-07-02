import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { uuid } = await request.json();

    if (!uuid || typeof uuid !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing UUID' }, { status: 400 });
    }

    const dirPath = path.resolve(process.cwd(), 'public', 'models', 'ai-generated', uuid);
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: 'Character directory not found' }, { status: 404 });
    }

    const savedMarkerPath = path.join(dirPath, '.saved');
    fs.writeFileSync(savedMarkerPath, ''); // Write an empty marker file

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

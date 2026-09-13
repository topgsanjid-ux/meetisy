import { NextResponse } from 'next/server';
import { uploadMediaToStorage } from '../../../lib/s3';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No media file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `standup_${Date.now()}_${file.name || 'audio.webm'}`.replace(/\s+/g, '_');

    const result = await uploadMediaToStorage(buffer, fileName, file.type || 'audio/webm');

    return NextResponse.json({
      success: true,
      mediaUrl: result.url,
      storageType: result.storageType,
      fileName
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

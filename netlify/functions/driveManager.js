// netlify/functions/driveManager.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export async function handler(event, context) {
  const NDUS_COOKIE = process.env.TERABOX_NDUS;
  const { action, dir, name, fs_id, target_dir } = event.queryStringParameters;

  if (!NDUS_COOKIE) {
    return { statusCode: 500, body: JSON.stringify({ error: "Configuration variable TERABOX_NDUS unset." }) };
  }

  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Cookie': `ndus=${NDUS_COOKIE}`,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Referer': 'https://www.terabox.com/main'
  };

  try {
    // 1. OPERATION: LIST DIRECTORY FILES WITH DIRECT STREAM LINKS
    if (action === 'list') {
      const targetPath = dir || '/';
      // Added absolute parameters required by the web core API layout: app_id=250528, web=1, channel=dubox
      const apiUrl = `https://www.terabox.com/api/list?dir=${encodeURIComponent(targetPath)}&order=time&desc=1&start=0&limit=120&dlink=1&app_id=250528&web=1&channel=dubox&clienttype=0`;
      
      const response = await fetch(apiUrl, { method: 'GET', headers: baseHeaders });
      const data = await response.json();
      
      return { 
        statusCode: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }, 
        body: JSON.stringify(data.list || []) 
      };
    }

    // 2. OPERATION: CREATE NEW INTERNAL DIRECTORY
    if (action === 'mkdir') {
      const apiUrl = `https://www.terabox.com/api/create?app_id=250528`;
      const bodyParams = new URLSearchParams({
        path: `${dir === '/' ? '' : dir}/${name}`,
        isdir: '1',
        size: '0',
        block_list: '[]'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams
      });
      const data = await response.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    // 3. OPERATION: MOVE FILES / FOLDERS (PASTE INTERFACE)
    if (action === 'move') {
      const apiUrl = `https://www.terabox.com/api/filemanager?opera=move&app_id=250528`;
      const filelist = JSON.stringify([{ fs_id: fs_id, to: target_dir }]);
      const bodyParams = new URLSearchParams({ filelist });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams
      });
      const data = await response.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid Action call" }) };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Execution tracing failure", details: error.message }) };
  }
}

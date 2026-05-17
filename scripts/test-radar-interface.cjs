/* eslint-disable no-console */
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function postRadar(payload) {
  const resp = await fetch(`${baseUrl}/api/radar/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: resp.status, body: json };
}

async function main() {
  const cases = [
    {
      name: '学习状态上报',
      payload: {
        device_id: 'DORM_2',
        status: 'Studying',
        target_state: 2,
        motion_distance: 0,
        static_distance: 170,
        motion_energy: 0,
        static_energy: 35,
        detect_distance: 180,
        light_sensor: 96,
      },
    },
    {
      name: '离舍高光提醒',
      payload: {
        device_id: 'DORM_2',
        status: 'Out',
        target_state: 0,
        motion_distance: 0,
        static_distance: 0,
        motion_energy: 0,
        static_energy: 0,
        detect_distance: 180,
        light_sensor: 200,
      },
    },
  ];

  for (const item of cases) {
    const result = await postRadar(item.payload);
    console.log(`\n[${item.name}]`);
    console.log('request:', item.payload);
    console.log('response status:', result.status);
    console.log('response body:', result.body);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

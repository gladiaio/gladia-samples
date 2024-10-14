<?php

$file_path = 'audio.mp3'; // Change with your file path

if (file_exists($file_path)) { // This is here to check if the file exists
    echo "- File exists\n";
} else {
    echo "- File does not exist\n";
}

$file_name = pathinfo($file_path, PATHINFO_FILENAME); // Get your audio file name
$file_extension = pathinfo($file_path, PATHINFO_EXTENSION); // Get your audio file extension

$audio_file = new CurlFile($file_path, 'audio/'.$file_extension); // Create a CurlFile object

$data = [
    // Sending a local audio file
    'audio' => $audio_file,
    // You can also send an URL for your audio file. Make sure it's the direct link and publicly accessible.
    // 'audio_url' => 'http://files.gladia.io/example/audio-transcription/split_infinity.wav',
    // Then you can pass any parameters you want. Please see: https://docs.gladia.io/api-reference/pre-recorded-flow
    'toggle_diarization' => true,
];

$headers = [
    'x-gladia-key: {YOUR_GLADIA_TOKEN}', // Replace with your Gladia Token
    'accept: application/json', // Accept json as a response, but we are sending a Multipart FormData
];

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, 'https://api.gladia.io/audio/text/audio-transcription/');
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

echo "- Sending request to Gladia API...\n";
$response = curl_exec($curl);
$status_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);

if ($status_code == 200) {
    echo "- Request successful\n";
    $result = json_decode($response, true);
    print_r($result);
} else {
    echo "- Request failed\n";
    $error = json_decode($response, true);
    print_r($error);
}

curl_close($curl);
echo "- End of work\n";

?>



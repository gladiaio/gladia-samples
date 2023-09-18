import asyncio
import os
import subprocess
import click
import cv2

import datetime
import requests
import os
import pyaudio

import numpy as np
import io
from PIL import Image

from selenium.webdriver.common.keys import Keys

from time import sleep
from selenium.webdriver.common.by import By


from selenium.webdriver.support import expected_conditions as EC

import undetected_chromedriver as uc

import asyncio
import subprocess

async def run_command_async(command):
    process = await asyncio.create_subprocess_shell(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for the process to complete
    stdout, stderr = await process.communicate()

    return stdout, stderr



async def google_sign_in(email, password, driver):

    # Open the Google Sign-In page
    driver.get("https://accounts.google.com")

    sleep(1)
    # Find the email input field and enter the email
    email_field = driver.find_element(By.NAME, "identifier")
    email_field.send_keys(email)
    # save screenshot
    driver.save_screenshot('screenshots/email.png')

    # Click the Next button
    #next_button = driver.find_element_by_id("identifierNext")
    sleep(2)

    driver.find_element(By.ID, "identifierNext").click()
    
    # Wait for a moment to let the next page load
    sleep(3)

    # save screenshot
    driver.save_screenshot('screenshots/password.png')

    # Find the password input field and enter the password
    password_field = driver.find_element(By.NAME, "Passwd")
    password_field.click()
    password_field.send_keys(password)

    # Press the Enter key to submit the form
    password_field.send_keys(Keys.RETURN)

    # Wait for the login process to complete
    sleep(5)
    # save screenshot
    driver.save_screenshot('screenshots/signed_in.png')


async def join_meet():
    meet_link = os.getenv("GMEET_LINK", 'https://meet.google.com/dau-pztc-yad')
    print(f"start recorder for {meet_link}")

    # delete the folder screenshots if it exists even if not empty
    print("Cleaning screenshots")
    if os.path.exists('screenshots'):
        #for each file in the folder delete it
        for f in os.listdir('screenshots'):
            os.remove(f'screenshots/{f}')
    else:    
        os.mkdir('screenshots')
    
    print("starting virtual audio drivers")
    # find audio source for specified browser
    subprocess.check_output('sudo rm -rf /var/run/pulse /var/lib/pulse /root/.config/pulse', shell=True)
    subprocess.check_output('sudo pulseaudio -D --verbose --exit-idle-time=-1 --system --disallow-exit  >> /dev/null 2>&1', shell=True)
    subprocess.check_output('sudo pactl load-module module-null-sink sink_name=DummyOutput sink_properties=device.description="Virtual_Dummy_Output"', shell=True)
    subprocess.check_output('sudo pactl load-module module-null-sink sink_name=MicOutput sink_properties=device.description="Virtual_Microphone_Output"', shell=True)
    subprocess.check_output('sudo pactl set-default-source MicOutput.monitor', shell=True)
    subprocess.check_output('sudo pactl set-default-sink MicOutput', shell=True)
    subprocess.check_output('sudo pactl load-module module-virtual-source source_name=VirtualMic', shell=True)

    options = uc.ChromeOptions() 

    options.add_argument("--use-fake-ui-for-media-stream")
    options.add_argument("--window-size=1920x1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-setuid-sandbox")
    #options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument("--disable-extensions")
    options.add_argument('--disable-application-cache')
    options.add_argument("--disable-setuid-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    log_path = "chromedriver.log"
    
    driver = uc.Chrome(service_log_path=log_path,use_subprocess=False, options=options)
    
    driver.set_window_size(1920, 1080)

    email = os.getenv("GMAIL_USER_EMAIL", "")
    password = os.getenv("GMAIL_USER_PASSWORD", "")
    gladia_api_key = os.getenv('GLADIA_API_KEY', ''),
    
    if email == "" or password == "":
        print("No email or password specified")
        return
    
    if gladia_api_key == "":
        print("No Gladia API key specified")
        print("Create one for free at https://app.gladia.io/")
        return

    print("Google Sign in")
    await google_sign_in(email, password, driver)

    driver.get(meet_link)

    driver.execute_cdp_cmd(
            "Browser.grantPermissions",
            {
                "origin": meet_link,
                "permissions": [
                    "geolocation", 
                    "audioCapture", 
                    "displayCapture", 
                    "videoCapture",
                    "videoCapturePanTiltZoom"
                    ]
            },
        )
 
    print("screenshot")
    driver.save_screenshot('screenshots/initial.png')
    print("Done save initial")

    try:
        driver.find_element(By.XPATH,
                            '/html/body/div/div[3]/div[2]/div/div/div/div/div[2]/div/div[1]/button').click()
        sleep(2)
    except:
        print("No popup")
    
    # disable microphone
    print("Disable microphone")

    sleep(10)
    missing_mic = False

    try:
        print("Try to dismiss missing mic")
        driver.find_element(By.CLASS_NAME, "VfPpkd-vQzf8d").find_element(By.XPATH,"..")    
        sleep(2)
        # take screenshot

        driver.save_screenshot('screenshots/missing_mic.png')
        
        ## save the webpage source html
        with open('screenshots/webpage.html', 'w') as f:
            f.write(driver.page_source)

        missing_mic = True
    except:
        pass
    
    try:
        print("Allow Microphone")
        driver.find_element(By.XPATH,
            '/html/body/div/div[3]/div[2]/div/div/div/div/div[2]/div/div[1]/button').click()
        sleep(2)
        # take screenshot
        driver.save_screenshot('screenshots/allow_microphone.png')
        print("Done save allow microphone")
    except:
        print("No Allow Microphone popup")
        

    #if not missing_mic:
    try:
        print("Try to disable microphone")
        driver.find_element(By.XPATH,
            '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[1]/div[1]/div/div[6]/div[1]/div/div').click()
    except:
        print("No microphone to disable")
    
    sleep(2)
    
    driver.save_screenshot('screenshots/disable_microphone.png')
    print("Done save microphone")



    # disable microphone
    print("Disable camera")
    if not missing_mic:
        
        driver.find_element(By.XPATH,
            '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[1]/div[1]/div/div[6]/div[2]/div').click()
        sleep(2)
    else:
        print("assuming missing mic = missing camera")
    driver.save_screenshot('screenshots/disable_camera.png')
    print("Done save camera")
    try:
        driver.find_element(By.XPATH,
            '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[2]/div[1]/div[1]/div[3]/label/input').click()
        sleep(2)
    
        driver.find_element(By.XPATH,
            '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[2]/div[1]/div[1]/div[3]/label/input').send_keys('TEST')
        sleep(2)
        driver.save_screenshot('screenshots/give_non_registered_name.png')

        print("Done save name")
        sleep(5)
        driver.find_element(By.XPATH,
            '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[2]/div[1]/div[2]/div[1]/div[1]/button/span').click()
        sleep(5)
    except:
        print("authentification already done")
        sleep(5)
        # take screenshot
        driver.save_screenshot('screenshots/authentification_already_done.png')
        print(driver.title)
        
        driver.find_element(By.XPATH,
                '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[2]/div[1]/div[2]/div[1]/div[1]/button').click()
        sleep(5)


        
    # try every 5 seconds for a maximum of 5 minutes
    # current date and time
    now = datetime.datetime.now()
    max_time = now + datetime.timedelta(minutes=os.getenv('MAX_WAITING_TIME_IN_MINUTES', 5))
    
    joined = False    

    while now < max_time and not joined:
        driver.save_screenshot('screenshots/joined.png')
        print("Done save joined")
        sleep(5)    

        try:
            driver.find_element(By.XPATH,
                            '/html/body/div[1]/div[3]/span/div[2]/div/div/div[2]/div[1]/button').click()
        
            driver.save_screenshot('screenshots/remove_popup.png')
            print("Done save popup in meeting")
        except:
            print("No popup in meeting")

        print("Try to click expand options")
        elements = driver.find_elements(By.CLASS_NAME, "VfPpkd-Bz112c-LgbsSe")
        expand_options = False
        for element in elements:
            if element.get_attribute("aria-label") == "More options":
                try:
                    element.click()
                    expand_options = True
                    print("Expand options clicked")
                except:
                    print("Not able to click expand options")
                    
        driver.save_screenshot('screenshots/expand_options.png')
        
        sleep(2)
        print("Try to move to full screen")

        if expand_options:
            li_elements = driver.find_elements(By.CLASS_NAME, "V4jiNc.VfPpkd-StrnGf-rymPhb-ibnC6b")
            for li_element in li_elements:
                txt = li_element.text.strip().lower()
                if "fullscreen" in txt:
                    li_element.click()
                    print("Full Screen clicked")
                    joined = True
                    break
                elif "minimize" in txt:
                    # means that you are already in fullscreen for some reason
                    joined = True
                    break
                
                elif "close_fullscreen" in txt:
                    # means that you are already in fullscreen for some reason
                    joined = True
                    break
                else:
                    pass
                
        driver.save_screenshot('screenshots/full_screen.png')
        print("Done save full screen")        

        
  
    duration = os.getenv('DURATION_IN_MINUTES', 15)
    duration = int(duration) * 60
    
    print("Start recording")
    record_command = f'ffmpeg -y -video_size 1920x1080 -framerate 30 -f x11grab -i :99 -f pulse -i default -t {duration} -c:v libx264 -pix_fmt yuv420p -c:a aac -strict experimental recordings/output.mp4'

    await asyncio.gather(
        run_command_async(record_command),
    )

    print("Done recording")
    print("Transcribing using Gladia")

    headers = {
        'x-gladia-key': os.getenv('GLADIA_API_KEY', ''),
        'accept': 'application/json',
    }

    file_path = 'recordings/output.mp4' # Change with your file path

    if os.path.exists(file_path): # This is here to check if the file exists
        print("- File exists")
    else:
        print("- File does not exist")

    file_name, file_extension = os.path.splitext(file_path) # Get your audio file name + extension

    if str(os.getenv('DIARIZATION')).lower() in ['true', 't', '1', 'yes', 'y', 'oui', 'o']:
        toggle_diarization = True
    else:
        toggle_diarization = False
    
    with open(file_path, 'rb') as f:  # Open the file
        file_content = f.read()  # Read the content of the file

    files = {
        'video': (file_path, file_content, 'video/'+file_extension[1:]), # Use the file content here
        'toggle_diarization': (None, toggle_diarization),
    }
    
    print('- Sending request to Gladia API...');

    response = requests.post('https://api.gladia.io/video/text/video-transcription/', headers=headers, files=files)
    if response.status_code == 200:
        print('- Request successful');
        result = response.json()
        # save the json response to recordings folder as transcript.json
        with open('recordings/transcript.json', 'w') as f:
            f.write(response.text)
    else:
        print('- Request failed');
        
        # save the json response to recordings folder as error.json
        with open('recordings/error.json', 'w') as f:
            f.write(response.text)

    print('- End of work');


if __name__ == '__main__':
    click.echo('starting google meet recorder...')
    asyncio.run(join_meet())
    click.echo('finished recording google meet.')

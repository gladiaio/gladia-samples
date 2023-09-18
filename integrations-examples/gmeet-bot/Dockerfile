# Use a base image, for example, Ubuntu
FROM ultrafunk/undetected-chromedriver

RUN mkdir /app /app/recordings /app/screenshots


# Set the working directory inside the container
WORKDIR /app

# Install necessary dependencies
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    pulseaudio \
    pavucontrol \
    curl \
    sudo \
    pulseaudio \
    xvfb \
    libnss3-tools \
    ffmpeg \
    xdotool \
    unzip \
    x11vnc \
    libfontconfig \
    libfreetype6 \
    xfonts-cyrillic \
    xfonts-scalable \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    xterm \
    vim

RUN usermod -aG audio root
RUN adduser root pulse-access

ENV key=value DBUS_SESSION_BUS_ADDRESS=unix:path=/run/dbus/system_bus_socket
ENV XDG_RUNTIME_DIR=/run/user/0


RUN mkdir -p /run/dbus
RUN chmod 755 /run/dbus

RUN rm -rf /var/run/pulse /var/lib/pulse /root/.config/pulse


RUN dbus-daemon --system --fork



RUN wget http://files.portaudio.com/archives/pa_stable_v190700_20210406.tgz

RUN tar -xvf pa_stable_v190700_20210406.tgz

RUN mv portaudio /usr/src/

WORKDIR /usr/src/portaudio

RUN ./configure && \
    make && \
    make install && \
    ldconfig

RUN pip3 install \
    pyaudio \
    click \
    opencv-python \
    Pillow

RUN echo 'user ALL=(ALL:ALL) NOPASSWD:ALL' >> /etc/sudoers

RUN adduser root pulse-access

RUN mkdir -p /var/run/dbus

RUN dbus-uuidgen > /var/lib/dbus/machine-id

#RUN dbus-daemon --config-file=/usr/share/dbus-1/system.conf --print-address

WORKDIR /app

#COPY chromedriver /usr/bin/chromedriver

# Copy your application code to the container
COPY . /app

# Set any environment variables if required
ENV GLADIA_API_KEY="YOUR_GLADIA_API_KEY"
ENV X_SERVER_NUM=1
ENV SCREEN_WIDTH=1280
ENV SCREEN_HEIGHT=1024
ENV SCREEN_RESOLUTION=1280x1024
ENV COLOR_DEPTH=24
ENV DISPLAY=:${X_SERVER_NUM}.0

RUN touch /root/.Xauthority
RUN chmod 600 /root/.Xauthority

RUN rm /run/dbus/pid
RUN mv pulseaudio.conf /etc/dbus-1/system.d/pulseaudio.conf

# Define the command to run your application
CMD ["/app/entrypoint.sh"]



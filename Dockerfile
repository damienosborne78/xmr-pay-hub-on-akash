# Install cloudflared and a process manager
RUN apk add --no-cache curl dumb-init

# Download and install cloudflared
RUN curl -s -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && \
    chmod +x /usr/local/bin/cloudflared

# Create a startup script
RUN echo '#!/bin/sh
nginx -g "daemon off;" &
exec dumb-init -- cloudflared tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}' > /start.sh
RUN chmod +x /start.sh

# Use the startup script as the command
CMD ["/start.sh"]   

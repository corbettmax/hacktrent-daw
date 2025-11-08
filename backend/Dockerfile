FROM ubuntu:22.04

# Build dependencies
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  g++ \
  make \
  curl \
  ca-certificates \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/drummachine

# Copy only backend sources
COPY backend/server.cpp ./backend/server.cpp

RUN mkdir -p /opt/drummachine/backend/include

# Download single-header dependencies at build time
RUN curl -fsSL https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h -o /opt/drummachine/backend/include/httplib.h \
 && curl -fsSL https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp -o /opt/drummachine/backend/include/json.hpp

WORKDIR /opt/drummachine/backend

# Build the server
RUN g++ -std=c++17 server.cpp -Iinclude -O2 -pthread -o drummachine_server

EXPOSE 8000

CMD ["./drummachine_server"]
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl \
  ca-certificates \
  gnupg \
  build-essential \
  jq \
  git \
  && rm -rf /var/lib/apt/lists/*

# Install dfx (DFINITY SDK)
RUN sh -c "curl -fsSL https://sdk.dfinity.org/install.sh | sh"

ENV PATH="/root/bin:$PATH"


WORKDIR /opt/drummachine

# Copy repository into the image (will include backend and dfx.json)
# Note: docker-compose build for backend uses repo root as context.
COPY . /opt/drummachine

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4943 8000

CMD ["/entrypoint.sh"]

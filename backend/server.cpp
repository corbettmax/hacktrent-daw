#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
#include <mutex>

#include "httplib.h"
#include "json.hpp"

using json = nlohmann::json;
using namespace httplib;

static std::unordered_map<std::string, std::unordered_map<std::string, json>> userPatterns;
static std::unordered_map<std::string, int> userTempos;
static std::mutex storageMutex;

json defaultPattern() {
    json rows = json::array();
    for (int r = 0; r < 4; ++r) {
        json row = json::array();
        for (int c = 0; c < 16; ++c) row.push_back(false);
        rows.push_back(row);
    }
    return rows;
}

int main() {
    Server svr;

    svr.Get("/defaultPattern", [](const Request& req, Response& res) {
        res.set_content(defaultPattern().dump(), "application/json");
    });

    // Get pattern: /pattern/{user}/{name}
    svr.Get(R"(/pattern/(.+)/(.+))", [](const Request& req, Response& res) {
        auto user = req.matches[1];
        auto name = req.matches[2];
        std::lock_guard<std::mutex> lock(storageMutex);
        auto uIt = userPatterns.find(user);
        if (uIt == userPatterns.end()) { res.status = 404; res.set_content("null", "application/json"); return; }
        auto &patterns = uIt->second;
        auto pIt = patterns.find(name);
        if (pIt == patterns.end()) { res.status = 404; res.set_content("null", "application/json"); return; }
        res.set_content(pIt->second.dump(), "application/json");
    });

    // Save pattern: POST /pattern/{user}/{name}  body: JSON pattern ([[bool]])
    svr.Post(R"(/pattern/(.+)/(.+))", [](const Request& req, Response& res) {
        auto user = req.matches[1];
        auto name = req.matches[2];
        try {
            auto body = json::parse(req.body);
            // Optionally validate shape
            std::lock_guard<std::mutex> lock(storageMutex);
            userPatterns[user][name] = body;
            res.status = 200;
            res.set_content("{}", "application/json");
        } catch (std::exception &e) {
            res.status = 400;
            res.set_content("{\"error\":\"invalid json\"}", "application/json");
        }
    });

    // Get tempo: /tempo/{user}
    svr.Get(R"(/tempo/(.+))", [](const Request& req, Response& res) {
        auto user = req.matches[1];
        std::lock_guard<std::mutex> lock(storageMutex);
        auto it = userTempos.find(user);
        if (it == userTempos.end()) {
            res.set_content("120", "application/json");
            return;
        }
        res.set_content(std::to_string(it->second), "application/json");
    });

    // Set tempo: POST /tempo/{user}  body: { "tempo": 120 }
    svr.Post(R"(/tempo/(.+))", [](const Request& req, Response& res) {
        auto user = req.matches[1];
        try {
            auto body = json::parse(req.body);
            int tempo = body.value("tempo", 120);
            std::lock_guard<std::mutex> lock(storageMutex);
            userTempos[user] = tempo;
            res.set_content("{}", "application/json");
        } catch (...) {
            res.status = 400;
            res.set_content("{\"error\":\"invalid json\"}", "application/json");
        }
    });

    std::cout << "DrumMachine C++ backend starting on port 8000" << std::endl;
    svr.listen("0.0.0.0", 8000);
    return 0;
}

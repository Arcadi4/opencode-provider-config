import {
    confirm,
    intro,
    outro,
    text,
    password,
    select,
    cancel,
    spinner,
    log,
} from "@clack/prompts";
import axios, { AxiosError } from "axios";
import { zstdCompress } from "bun";

const urlRegex = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(:\d+)?(\/\S*)?$/;

const apiTypes = [
    { value: "@ai-sdk/openai", label: "OpenAI" },
    { value: "@ai-sdk/openai-compatible", label: "OpenAI Compatible" },
    { value: "@ai-sdk/anthropic", label: "Anthropic" },
];

intro("Setup a third-party provider");

const name = await text({
    message: "Enter a name for your provider (e.g. OpenAI, Azure, etc.)",
});
const nameValue = name.toString().trim();
if (!nameValue) {
    cancel("Provider name cannot be empty.");
}

const baseUrl = await text({
    message:
        "Enter the base URL of your provider (e.g. https://api.openai.com)",
});
let baseUrlValue = baseUrl.toString().trim().toLowerCase();
if (baseUrlValue.endsWith("/")) {
    baseUrlValue = baseUrlValue.slice(0, -1);
}
if (!baseUrlValue) {
    cancel("Base URL cannot be empty.");
} else if (!urlRegex.test(baseUrlValue)) {
    cancel("Please enter a valid URL.");
}

const apiKey = await password({
    message: "Enter your API key",
    mask: "*",
});
const apiKeyValue = apiKey.toString().trim();
if (!apiKeyValue) {
    cancel("API key cannot be empty.");
}

const apiType = await select({
    message: "Which format does your provider use?",
    options: apiTypes,
});
const apiTypeValue = apiType.toString();

const getModelListFromApi = await confirm({
    message: "Do you want to fetch the list of available models from the API?",
}).then((res) => res.valueOf());

let models: string[];
if (getModelListFromApi) {
    const s = spinner();
    s.start("Fetching model list...");
    models = await getModelList(baseUrlValue, apiKeyValue, apiTypeValue)
        .then((models) => {
            s.stop("model list fetched successfully.");
            log.success(`Fetched ${models.length} models from the API.`);
            return models;
        })
        .catch((err: AxiosError) => {
            s.stop("Failed to fetch model list.");
            log.error(
                `Error fetching model list: ${err.message} - ${err.response?.status} ${err.response?.statusText}`,
            );
            return [];
        })
        .finally(() => s.stop());
} else {
    models = [];
}

const jsonConfig = {
    [nameValue]: {
        npm: apiTypeValue,
        options: {
            baseUrl: baseUrlValue,
            apiKey: apiKeyValue,
            setCacheKey: true,
        },
        models: models
            ? models.map((model: string) => ({
                  [model]: {},
              }))
            : {},
    },
};

const fillModelOptions = await confirm({
    message: "Do you want to fill in default options for each models?",
}).then((res) => res.valueOf());

if (fillModelOptions) {
    log.info("this feature is not implemented yet, stay tuned!");
}

log.info("\nHere is a preview of your provider configuration:\n");
log.info(JSON.stringify(jsonConfig, null, 2));

const writeToConfig = await confirm({
    message: "Do you want to write this configuration to a file now?",
}).then((res) => res.valueOf());

if (writeToConfig) {
    log.warning("this feature is not implemented yet, stay tuned!");
}

outro("You are all set!");

async function getModelList(
    baseUrl: string,
    apiKey: string,
    apiType: string,
): Promise<string[]> {
    let res;
    switch (apiType) {
        case "@ai-sdk/openai":
        case "@ai-sdk/openai-compatible":
            res = await axios.get(`${baseUrl}/models`, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            });

        case "@ai-sdk/anthropic":
            res = await axios.get(`${baseUrl}/models`, {
                headers: {
                    "x-api-key": apiKey,
                },
            });
    }
    return res
        ? res.data.data.map((model: any) => {
              if (model.object && model.object === "model") {
                  return model.id;
              } else if (!model.object) {
                  return model.id;
              } else if (!model.id) {
                  return null;
              } else {
                  return null;
              }
          })
        : [];
}

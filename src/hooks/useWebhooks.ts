import { useState, useEffect } from 'react';
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  fetchSignalNames,
  generateCEL,
} from '@/services/webhook';
import { Webhook, Condition } from '@/types/webhook';

import { getDevJwt } from '@/utils/devJwt';

export const useWebhooksNew = (clientId: string) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Webhook[]>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getDevJwt(clientId);
        if (!token)
          return setError(new Error(`No devJWT found for clientId ${clientId}`));
        setLoading(true);
        const data = await fetchWebhooks({ token });
        setData(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error('Error while fetching webhooks'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId]);
  return {
    data,
    error,
    loading,
  };
};

export const useWebhooks = () => {
  const [webhooks] = useState<Webhook[]>([]);
  const [currentWebhook, setCurrentWebhook] = useState<Partial<Webhook> | null>(null);
  const [parametersInput, setParametersInput] = useState<string>('{}');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
  const [signalNames, setSignalNames] = useState<string[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [logic, setLogic] = useState('AND');
  const [generatedCEL, setGeneratedCEL] = useState('');
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  const loadWebhooks = async () => {
    try {
      // const data = await fetchWebhooks();
      // setWebhooks(data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    }
  };

  const loadSignalNames = async () => {
    try {
      const signals = await fetchSignalNames();
      setSignalNames(signals);
    } catch (error) {
      console.error('Error fetching signal names:', error);
    }
  };

  useEffect(() => {
    loadWebhooks();
    loadSignalNames();
  }, []);

  useEffect(() => {
    const generateAndSetCEL = async () => {
      try {
        if (conditions.length > 0 && logic) {
          const celExpression = await generateCEL(conditions, logic);
          setGeneratedCEL(celExpression);
          if (currentWebhook) {
            setCurrentWebhook({
              ...currentWebhook,
              trigger: celExpression,
            });
          }
        }
      } catch (error) {
        console.error('Failed to generate CEL:', error);
      }
    };

    generateAndSetCEL();
  }, [logic, conditions]);

  const handleCreate = async () => {
    try {
      const parsedParameters = JSON.parse(parametersInput);
      const payload = {
        ...currentWebhook,
        trigger: generatedCEL,
        parameters: parsedParameters,
      };
      await createWebhook(payload as Webhook);
      await loadWebhooks();
      resetForm();
    } catch (error) {
      console.error('Error creating webhook:', error);
      alert('Invalid JSON in Parameters field.');
    }
  };

  const handleUpdate = async () => {
    if (!currentWebhook?.id) return;
    try {
      const parsedParameters = JSON.parse(parametersInput);
      const payload = {
        ...currentWebhook,
        trigger: generatedCEL,
        parameters: parsedParameters,
      };
      await updateWebhook(currentWebhook.id, payload);
      await loadWebhooks();
      resetForm();
    } catch (error) {
      console.error('Error updating webhook:', error);
      alert('Invalid JSON in Parameters field.');
    }
  };

  const handleDelete = async () => {
    if (webhookToDelete) {
      await deleteWebhook(webhookToDelete.id);
      await loadWebhooks();
      setWebhookToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const resetForm = () => {
    setCurrentWebhook(null);
    setParametersInput('{}');
    setConditions([]);
    setGeneratedCEL('');
    setLogic('AND');
  };

  const handleShowCreateForm = () => {
    resetForm();
    setCurrentWebhook({
      description: 'My Cool Webhook',
      target_uri: 'https://example.com/webhook',
    });
  };

  return {
    webhooks,
    currentWebhook,
    setCurrentWebhook,
    parametersInput,
    setParametersInput,
    conditions,
    setConditions,
    logic,
    setLogic,
    signalNames,
    generatedCEL,
    expandedWebhook,
    setExpandedWebhook,
    showDeleteConfirm,
    setShowDeleteConfirm,
    webhookToDelete,
    setWebhookToDelete,
    handleCreate,
    handleUpdate,
    handleDelete,
    resetForm,
    handleShowCreateForm,
  };
};

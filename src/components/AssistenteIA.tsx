import { useState } from 'react';
import { MessageCircle, X, Send, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistenteIA() {
  const { user, isRH } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: isRH 
        ? 'Olá! Sou o assistente de RH da Pneu Forte. Como posso ajudar você hoje com a gestão de candidatos e vagas?'
        : user
        ? 'Olá! Sou o assistente da Pneu Forte. Estou aqui para ajudar com suas candidaturas e dúvidas sobre nossas vagas. Como posso te ajudar?'
        : 'Olá! Sou o assistente da Pneu Forte. Estou aqui para te ajudar a conhecer nossas vagas e tirar dúvidas sobre a empresa. Como posso te ajudar?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickSuggestions = isRH 
    ? [
        "Quantos candidatos temos hoje?",
        "Candidatos em entrevista",
        "Estatísticas das vagas",
        "Buscar candidato"
      ]
    : user
    ? [
        "Como está minha candidatura?",
        "Quais vagas estão abertas?",
        "Me fale sobre a empresa",
        "Como funciona o processo?"
      ]
    : [
        "Quais vagas estão abertas?",
        "Quero acompanhar minha candidatura",
        "Me fale sobre a empresa",
        "Como funciona o processo?"
      ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Não precisa passar token para candidatos anônimos
      const invokeOptions: any = {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      };

      const { data, error } = await supabase.functions.invoke('assistente-ia', invokeOptions);

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 h-12 w-12 md:h-16 md:w-16 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-[hsl(45,100%,50%)] hover:bg-[hsl(45,100%,45%)] text-black"
        size="icon"
      >
        <Wrench className="h-6 w-6 md:h-8 md:w-8" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[440px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-[hsl(45,100%,50%)] to-[hsl(45,100%,60%)]">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-black">
                <AvatarImage src="/assistente-mecanico.svg" alt="Assistente" />
                <AvatarFallback className="bg-black text-[hsl(45,100%,50%)]">
                  <Wrench className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-black text-lg">Assistente Pneu Forte</SheetTitle>
                <p className="text-sm text-black/80">Mecânico virtual</p>
              </div>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mt-1 border border-border">
                      <AvatarImage src="/assistente-mecanico.svg" alt="Assistente" />
                      <AvatarFallback className="bg-[hsl(45,100%,50%)] text-black">
                        <Wrench className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1 border border-border">
                    <AvatarImage src="/assistente-mecanico.svg" alt="Assistente" />
                    <AvatarFallback className="bg-[hsl(45,100%,50%)] text-black">
                      <Wrench className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Suggestions */}
          {messages.length <= 1 && (
            <div className="px-6 py-3 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Sugestões rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickSuggestion(suggestion)}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputText);
              }}
              className="flex gap-2"
            >
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !inputText.trim()}
                className="bg-[hsl(45,100%,50%)] hover:bg-[hsl(45,100%,45%)] text-black"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

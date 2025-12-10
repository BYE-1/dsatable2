import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage } from '../../models/chat-message.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() sessionId!: number;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage: string = '';
  loading = false;
  sending = false;
  error: string | null = null;
  currentUserId: number | null = null;
  private pollingSubscription?: Subscription;
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.currentUserId = currentUser.id;
    }

    this.loadMessages();
    // Start polling for new messages
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadMessages(): void {
    this.loading = true;
    this.error = null;

    this.chatService.getMessages(this.sessionId).subscribe({
      next: (data: ChatMessage[]) => {
        this.messages = data;
        this.loading = false;
        this.shouldScrollToBottom = true;
      },
      error: (err: any) => {
        this.error = 'Failed to load messages.';
        this.loading = false;
        console.error('Error loading messages:', err);
      }
    });
  }

  startPolling(): void {
    this.pollingSubscription = this.chatService.pollMessages(this.sessionId).subscribe({
      next: (data: ChatMessage[]) => {
        // Only update if we have new messages
        if (data.length !== this.messages.length || 
            (data.length > 0 && this.messages.length > 0 && 
             data[data.length - 1].id !== this.messages[this.messages.length - 1].id)) {
          const wasAtBottom = this.isScrolledToBottom();
          this.messages = data;
          if (wasAtBottom) {
            this.shouldScrollToBottom = true;
          }
        }
      },
      error: (err: any) => {
        console.error('Error polling messages:', err);
      }
    });
  }

  sendMessage(messageText?: string): void {
    const textToSend = messageText || this.newMessage.trim();
    if (!textToSend || this.sending) {
      return;
    }

    this.sending = true;
    if (!messageText) {
      this.newMessage = '';
    }

    this.chatService.sendMessage(this.sessionId, textToSend).subscribe({
      next: (message: ChatMessage) => {
        // Message will be added via polling, but we can add it immediately for better UX
        if (!this.messages.find(m => m.id === message.id)) {
          this.messages.push(message);
          this.shouldScrollToBottom = true;
        }
        this.sending = false;
        // Focus back on input only if it was a user input
        if (!messageText) {
          setTimeout(() => {
            if (this.messageInput) {
              this.messageInput.nativeElement.focus();
            }
          }, 0);
        }
      },
      error: (err: any) => {
        this.error = 'Failed to send message.';
        this.sending = false;
        if (!messageText) {
          this.newMessage = textToSend; // Restore message
        }
        console.error('Error sending message:', err);
      }
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isOwnMessage(message: ChatMessage): boolean {
    return message.author.id === this.currentUserId;
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const current = new Date(this.messages[index].createdAt);
    const previous = new Date(this.messages[index - 1].createdAt);
    return current.toDateString() !== previous.toDateString();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private isScrolledToBottom(): boolean {
    if (!this.messagesContainer) return true;
    const element = this.messagesContainer.nativeElement;
    const threshold = 100; // pixels from bottom
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }
}


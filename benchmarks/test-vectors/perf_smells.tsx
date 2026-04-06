// TEST VECTOR: Performance, Code Smells, and Design Pattern Violations
// Ground Truth: 2 HIGH perf issues, 3 MEDIUM code smells, 2 MEDIUM design issues

import React, { useState, useEffect } from 'react';

// BUG-1: N+1 query problem (HIGH - Performance)
async function loadDashboard() {
  const users = await fetch('/api/users').then(r => r.json());
  // Fires 100 individual requests instead of a single batch call
  const profiles = await Promise.all(
    users.map(u => fetch(`/api/profile/${u.id}`).then(r => r.json()))
  );
  return profiles;
}

// BUG-2: Memory leak - no cleanup (HIGH - Performance)
function LiveChat() {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (e) => {
      setMessages(prev => [...prev, JSON.parse(e.data)]);
    };
    // Missing: return () => ws.close();
  }, []);

  return <div>{messages.map(m => <p key={m.id}>{m.text}</p>)}</div>;
}

// BUG-3: God function - does too much (MEDIUM - Code Smell)
async function processOrder(order) {
  // Validate
  if (!order.items || order.items.length === 0) throw new Error('No items');
  if (!order.address) throw new Error('No address');
  if (!order.payment) throw new Error('No payment');
  
  // Calculate totals
  let total = 0;
  for (const item of order.items) {
    const product = await fetch(`/api/product/${item.id}`).then(r => r.json());
    total += product.price * item.quantity;
  }
  
  // Apply discounts
  if (order.coupon) {
    const coupon = await fetch(`/api/coupon/${order.coupon}`).then(r => r.json());
    total *= (1 - coupon.discount);
  }
  
  // Process payment
  const paymentResult = await fetch('/api/charge', {
    method: 'POST',
    body: JSON.stringify({ amount: total, card: order.payment })
  }).then(r => r.json());
  
  // Send notification
  await fetch('/api/notify', {
    method: 'POST',
    body: JSON.stringify({ email: order.email, orderId: paymentResult.id })
  });
  
  // Update inventory
  for (const item of order.items) {
    await fetch(`/api/inventory/${item.id}/decrement`, { method: 'POST' });
  }
  
  return paymentResult;
}

// BUG-4: Duplicate code (MEDIUM - Code Smell) 
function formatUserName(user) {
  return user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + ' ' +
         user.lastName.charAt(0).toUpperCase() + user.lastName.slice(1);
}
function formatEmployeeName(emp) {
  return emp.firstName.charAt(0).toUpperCase() + emp.firstName.slice(1) + ' ' +
         emp.lastName.charAt(0).toUpperCase() + emp.lastName.slice(1);
}

// BUG-5: Magic numbers (MEDIUM - Code Smell)
function calculateShipping(weight, distance) {
  if (weight > 50) return distance * 0.75 + 15.99;
  if (weight > 20) return distance * 0.45 + 8.99;
  return distance * 0.25 + 4.99;
}

// BUG-6: Missing error boundary (MEDIUM - Design Pattern)
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/api/user/${userId}`)
      .then(r => r.json())
      .then(setUser);
    // No .catch() — silent failure
  }, [userId]);
  
  return <div>{user?.name}</div>;
}

// BUG-7: Tight coupling (MEDIUM - Design Pattern)
class OrderService {
  async createOrder(data) {
    const db = new PostgresDB('postgres://localhost:5432/shop'); // hardcoded
    const mailer = new SMTPMailer('smtp.gmail.com', 587); // hardcoded
    const result = await db.insert('orders', data);
    await mailer.send(data.email, 'Order Confirmed', `Order #${result.id}`);
    return result;
  }
}

export { loadDashboard, LiveChat, processOrder, calculateShipping, UserProfile, OrderService };
